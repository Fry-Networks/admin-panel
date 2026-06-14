import { Button, Flex, Textarea, DatePicker } from '@tremor/react';
import { Key, useEffect, useState } from 'react';
import '../app/css/devices.css';
import { Vote } from '../lib/vote-schema';
import { Dialog, DialogPanel, Divider, TextInput } from '@tremor/react';

import { RiCloseLine } from '@remixicon/react';
import { title } from 'process';
export default function ModalEditVote({
  isOpen,
  setIsOpen,
  vote,
  index
}: {
  isOpen: boolean;
  setIsOpen: Function;
  vote: { id: string; vote: Vote | undefined } | undefined;
  index: number;
}) {
  const [vote_title, setVoteTitle] = useState(
    vote && vote.vote ? vote.vote.title : ''
  );
  const [vote_description, setVoteDescription] = useState(
    vote && vote.vote ? vote.vote.description : ''
  );
  const [vote_end_date, setVoteEndDate] = useState(
    vote && vote.vote ? vote.vote.end_date : Date()
  );
  const [vote_options, setVoteOptions] = useState(
    vote && vote.vote
      ? vote.vote.votes
      : ([{}] as {
          title: string;
          description: string;
        }[])
  );
  const [updateSuccess, setUpdateSuccess] = useState(''); // State to track update success
  const handleAddOption = (e: any) => {
    e.preventDefault();
    setVoteOptions([...vote_options, { title: '', description: '' }]);
  };

  useEffect(() => {
    if (vote === undefined || vote.vote === undefined) return;

    // console.log('Use effect');
    // console.log(vote.vote);
    setVoteTitle(vote.vote.title);
    setVoteDescription(vote.vote.description);
    setVoteEndDate(vote.vote.end_date);
    setVoteOptions(vote.vote.votes);
  }, [vote]);
  const updateOption = (index: any, field: any, value: any) => {
    const updatedOptions = vote_options.map((option: any, idx: any) => {
      if (idx === index) {
        return { ...option, [field]: value };
      }
      return option;
    });
    setVoteOptions(updatedOptions);
  };
  const handleSubmit = async (e: any) => {
    if (!vote) return;

    const updateData = {
      id: vote.id,
      title: vote_title,
      description: vote_description,
      options: vote_options
    };
    const response = await fetch('/api/edit-vote', {
      // Replace with your actual API endpoint
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      setUpdateSuccess('error'); // Reset success state
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    // console.log('Updated product:', result);
    setIsOpen(false);
    window.location.reload();
  };
  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        setIsOpen(false);
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      static={true}
      className={'z-[' + (2000 + 200 * index) + ']'}
    >
      <DialogPanel
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="sm:max-w-5xl bg-gray-900 border border-gray-700"
      >
        <div className="absolute right-0 top-0 pr-3 pt-3">
          <button
            type="button"
            className="rounded-tremor-small p-2 text-tremor-content-subtle hover:bg-tremor-background-subtle hover:text-tremor-content dark:text-dark-tremor-content-subtle hover:dark:bg-dark-tremor-background-subtle hover:dark:text-tremor-content"
            onClick={() => setIsOpen(false)}
            aria-label="Close"
          >
            <RiCloseLine className="h-5 w-5 shrink-0" aria-hidden={true} />
          </button>
        </div>
        <form action="#" method="POST">
          <h4 className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
            Edit a Vote
          </h4>
          <TextInput
            placeholder="Title"
            defaultValue={vote_title}
            className="mt-2"
            onValueChange={(value) => setVoteTitle(value)}
          />
          <Textarea
            placeholder="Description"
            defaultValue={vote_description}
            className="mt-2"
            onValueChange={(value) => setVoteDescription(value)}
          />
          <Divider />
          <Flex className="grid grid-cols-2 gap-4">
            {vote_options.map(
              (
                option: {
                  title: string | undefined;
                  description: string | number | undefined;
                },
                index: Key | null | undefined
              ) => (
                <div key={index} className="mr-5">
                  <h4 className="font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong">
                    {/* Ensure numeric index for display math. */}
                    Option {Number(index) + 1}
                  </h4>
                  <TextInput
                    placeholder="Option Title"
                    value={option.title}
                    className="mt-2"
                    onValueChange={(value) =>
                      updateOption(index, 'title', value)
                    }
                  />
                  <Textarea
                    placeholder="Option Description"
                    value={option.description}
                    className="mt-2"
                    onValueChange={(value) =>
                      updateOption(index, 'description', value)
                    }
                  />
                </div>
              )
            )}
          </Flex>
          <Flex
            flexDirection="col"
            className="mt-2"
            alignItems="start"
            justifyContent="start"
          >
            <Button className="mt-2" onClick={handleAddOption}>
              Add option
            </Button>
            <div className="w-full flex justify-center">
              {' '}
              {/* Container to center the button */}
              <Button
                className="mt-2"
                color="green"
                size="xl"
                onClick={(e) => {
                  e.preventDefault();
                }}
              >
                Submit
              </Button>
            </div>
          </Flex>
        </form>
      </DialogPanel>
    </Dialog>
  );
}
